import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link, useParams } from "react-router";
import useSWR from "swr";

import { CURRENCY } from "../lib/env";
import { API_URL } from "../lib/env";
import {
  decodeInvoice,
  fetcher,
  isInvoice,
  satoshisToSatcomma,
  trimLongString,
} from "../lib/utils";
import Error from "./Error";
import Header from "./Header";
import { LoadingSpinnerFullscreen } from "./LoadingSpinner";
import type { Channel, NodeInfo } from "./Node";

function SearchResult({ nodeInfo }: { nodeInfo: NodeInfo }) {
  const channels = useSWR<Channel[]>(
    `${API_URL}/v2/lightning/${CURRENCY}/channels/${nodeInfo.id}`,
    async (url: string) => {
      try {
        return await fetcher<Channel[]>(url);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        return [];
      }
    },
  );

  return (
    <div className="mt-4">
      <Link to={`/node/${nodeInfo.id}`}>
        <Card className="cursor-pointer shadow-none hover:shadow-sm shadow-yellow-500/50 transition duration-300">
          <CardHeader>
            <CardTitle>{nodeInfo.alias}</CardTitle>
            <CardDescription>{trimLongString(nodeInfo.id)}</CardDescription>
            <CardDescription>
              {channels.data !== undefined ? (
                <>
                  <p>Channels: {channels.data.length}</p>
                  <p>
                    Capacity:{" "}
                    {satoshisToSatcomma(
                      channels.data.reduce(
                        (acc, channel) => acc + channel.capacity,
                        0,
                      ),
                    )}
                  </p>
                </>
              ) : (
                <p>Loading...</p>
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>
    </div>
  );
}

export default function Search() {
  const { query } = useParams();
  const nodeInfo = useSWR<NodeInfo[]>(
    `${API_URL}/v2/lightning/${CURRENCY}/search?${new URLSearchParams({
      alias: query!,
    })}`,
    async (url: string) => {
      const invoiceType = isInvoice(query!);
      if (invoiceType !== undefined) {
        const pubkeys = await decodeInvoice(invoiceType, query!);
        const nodes = await Promise.allSettled(
          pubkeys.map(async (pubkey) => {
            return await fetcher<NodeInfo>(
              `${API_URL}/v2/lightning/${CURRENCY}/node/${pubkey}`,
            );
          }),
        );
        if (nodes.every((node) => node.status === "rejected")) {
          throw nodes.map((node) => node.reason).join(", ");
        }

        return nodes
          .filter(
            (node): node is PromiseFulfilledResult<NodeInfo> =>
              node.status === "fulfilled",
          )
          .map((node) => node.value);
      }

      return await fetcher<NodeInfo[]>(url);
    },
  );

  if (nodeInfo.error) return <Error error={nodeInfo.error} />;
  if (nodeInfo.isLoading) {
    return <LoadingSpinnerFullscreen />;
  }

  return (
    <>
      <Header />
      <div className="flex flex-col items-center justify-center">
        <h1>Search result</h1>
        <p>
          {nodeInfo.data!.length} results found for "{trimLongString(query!)}"
        </p>
        <div className="w-full max-w-xl">
          {nodeInfo.data!.map((node) => (
            <SearchResult key={node.id} nodeInfo={node} />
          ))}
        </div>
      </div>
    </>
  );
}
