import { bech32, utf8 } from "@scure/base";
import { useState } from "react";
import { useParams } from "react-router";
import useSWR from "swr";

import { lookup } from "../lib/dohLookup";
import { API_URL, CURRENCY, DNS_OVER_HTTPS } from "../lib/env";
import { isLnurl, isSatsAddress, trimLongString } from "../lib/utils";
import Error from "./Error";
import Header from "./Header";
import LoadingSpinner, { LoadingSpinnerFullscreen } from "./LoadingSpinner";
import { Button } from "./ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

const enum InfoType {
  LNURL = "LNURL",
  BIP353 = "BIP-353",
}

type Info = {
  type: InfoType;
  properties: Record<string, string>;
};

const getLnurl = async (lnurl: string): Promise<Info> => {
  const res = await fetch(lnurl, { redirect: "follow" });
  const data = await res.json();
  console.log("LNURL fetch response:", data);

  if (data.status === "ERROR") {
    throw "LNURL threw error";
  }

  return {
    type: InfoType.LNURL,
    properties: {
      url: lnurl,
      ...data,
    },
  };
};

const resolveBip353 = async (bip353: string): Promise<Info> => {
  const split = bip353.split("@");
  if (split.length !== 2) {
    throw "invalid BIP-353";
  }

  const bip353Prefix = "₿";
  if (split[0].startsWith(bip353Prefix)) {
    split[0] = split[0].substring(bip353Prefix.length);
  }

  console.log(`Fetching BIP-353: ${bip353}`);

  const res = await lookup(
    `${split[0]}.user._bitcoin-payment.${split[1]}`,
    "txt",
    DNS_OVER_HTTPS
  );

  const nowUnix = Date.now() / 1_000;
  if (nowUnix < res.valid_from) throw "proof is not valid yet";
  if (nowUnix > res.expires) throw "proof has expired";

  if (!res.verified_rrs?.length || res.verified_rrs[0].type !== "txt") {
    throw "invalid proof";
  }

  const paymentRequest = res.verified_rrs[0].contents;
  const params = new URLSearchParams(paymentRequest.split("?")[1]);

  const offer = params.get("lno")?.replace(/"/g, "") ?? "";
  const ark = params.get("ark")?.replace(/"/g, "").trim() ?? "";

  console.log("Resolved offer for BIP-353:", offer);
  if (ark) console.log("Resolved ark for BIP-353:", ark);

  return {
    type: InfoType.BIP353,
    properties: {
      offer,
      ...(ark && { ark }),
    },
  };
};

const InfoCard = ({ type, properties }: Info) => {
  const [amount, setAmount] = useState(0);
  const [invoice, setInvoice] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [fetching, setFetching] = useState(false);

  const fetchInvoice = async () => {
    setInvoice(undefined);
    setError(undefined);
    setFetching(true);

    try {
      switch (type) {
        case InfoType.LNURL: {
          const url = new URL(properties.callback);
          url.searchParams.set("amount", (BigInt(amount) * BigInt(1000)).toString());

          const res = await fetch(url.toString());
          const data = await res.json();

          if (data.status === "ERROR") {
            setError(data.reason);
            return;
          }

          setInvoice(data.pr);
          break;
        }

        default: {
          const res = await fetch(
            `${API_URL}/v2/lightning/${CURRENCY}/bolt12/fetch`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                offer: properties.offer,
                amount,
              }),
            }
          );

          const data = await res.json();
          setInvoice(data.invoice);
        }
      }
    } catch (error) {
      setError((error as Error).message);
      console.error("Invoice fetch error", error);
    } finally {
      setFetching(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{type}</CardTitle>
        <CardDescription>
          {Object.entries(properties).map(([key, value]) => (
            <p key={key}>
              {key}:{value}
            </p>
          ))}

        

          <div className="flex flex-row justify-center mt-4 gap-2">
            <Input
              type="number"
              onChange={(e) => setAmount(Number(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  fetchInvoice();
                }
              }}
            />
            <Button disabled={amount === 0 || fetching} onClick={fetchInvoice}>
              Fetch
            </Button>
          </div>

          {fetching && (
            <div className="flex flex-row justify-center mt-4">
              <LoadingSpinner />
            </div>
          )}
          {invoice && <p className="mt-4">{invoice}</p>}
          {error && <p className="mt-4 text-red-500 text-center">{error}</p>}
        </CardDescription>
      </CardHeader>
    </Card>
  );
};

const Resolver = () => {
  const { input } = useParams();
  const decodedInput = input ? decodeURIComponent(input) : undefined;

  const info = useSWR<Info[]>(decodedInput, async () => {
    if (!decodedInput) return [];

    const promises: Promise<Info>[] = [];

    if (isSatsAddress(decodedInput)) {
      const [user, domain] = decodedInput.split("@");
      const lnurl = `https://${domain}/.well-known/lnurlp/${user}`;

      promises.push(getLnurl(lnurl));
      promises.push(resolveBip353(decodedInput));
    } else if (isLnurl(decodedInput)) {
      const { bytes } = bech32.decodeToBytes(decodedInput);
      promises.push(getLnurl(utf8.encode(bytes)));
    }

    return await Promise.allSettled(promises)
      .then((res) => res.filter((r) => r.status === "fulfilled"))
      .then((res) => res.map((r) => (r as PromiseFulfilledResult<Info>).value));
  });

  if (info.error) return <Error error={info.error} />;
  if (info.isLoading) return <LoadingSpinnerFullscreen />;

  return (
    <>
      <Header />
      <div className="flex flex-col items-center justify-center">
        <h1>Resolving: {trimLongString(decodedInput!)}</h1>
        <div className="w-full max-w-xl mt-10 break-all flex flex-col gap-4">
          {info.data!.length === 0 && <h2>No info found</h2>}
          {info.data!.map((info) => (
            <InfoCard
              key={info.type + JSON.stringify(info.properties)}
              type={info.type}
              properties={info.properties}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default Resolver;
