import { Link, useParams } from "react-router";
import useSWR from "swr";

import { API_URL } from "../lib/env";
import { CURRENCY } from "../lib/env";
import {
  convertChannelid,
  satoshisToSatcomma,
  trimLongString,
} from "../lib/utils";
import Error from "./Error";
import Header from "./Header";
import { LoadingSpinnerFullscreen } from "./LoadingSpinner";

type Policy = {
  node: {
    id: string;
    alias: string;
    color: string;
  };
  active: boolean;
  baseFeeMillisatoshi: number;
  feePpm: number;
  delay: number;
  htlcMinimumMillisatoshi: number;
  htlcMaximumMillisatoshi: number;
};

type ChannelInfo = {
  shortChannelId: string;
  capacity: number;
  policies: [Policy, Policy];
};

function Policy({ policy }: { policy: Policy }) {
  return (
    <div
      className={`${!policy.active ? "bg-yellow-500/5" : ""} rounded-md p-4`}>
      <Link to={`/node/${policy.node.id}`}>
        <h2 className="text-xl text-center">
          {policy.node.alias} ({trimLongString(policy.node.id)})
        </h2>
      </Link>
      <div className="flex flex-row justify-between gap-4 mt-1">
        <h2>
          Base Fee: {(policy.baseFeeMillisatoshi / 1_000).toFixed(3)} sats
        </h2>
        <h2>Fee PPM: {policy.feePpm}</h2>
      </div>
      <div className="flex flex-row justify-between gap-4 mt-1">
        <div className="flex flex-col justify-between mt-1">
          <h2>HTLC</h2>
          <h2>
            Minimum:{" "}
            {satoshisToSatcomma(policy.htlcMinimumMillisatoshi / 1_000)}
          </h2>
          <h2>
            Maximum:{" "}
            {satoshisToSatcomma(policy.htlcMaximumMillisatoshi / 1_000)}
          </h2>
        </div>
        <h2>Delay: {policy.delay}</h2>
      </div>
    </div>
  );
}

export default function Channel() {
  const { channel } = useParams();
  const channelInfo = useSWR<ChannelInfo>(
    `${API_URL}/v2/lightning/${CURRENCY}/channel/${channel}`,
  );

  if (channelInfo.error) {
    return <Error error={channelInfo.error} />;
  }
  if (channelInfo.isLoading) {
    return <LoadingSpinnerFullscreen />;
  }

  return (
    <>
      <Header />
      <div className="flex flex-col items-center justify-center">
        <h1>Channel</h1>
        <div className="flex flex-col items-center justify-center">
          <h2 className="text-xl text-gray-300">
            {convertChannelid(channelInfo.data!.shortChannelId)}
          </h2>
          <h2 className="text-xl text-gray-300">
            {channelInfo.data!.shortChannelId}
          </h2>
        </div>
        <h2 className="text-xl">
          Capacity: {satoshisToSatcomma(channelInfo.data!.capacity)}
        </h2>
        <div className="flex flex-row justify-between gap-10 mt-4">
          {channelInfo.data!.policies.map((policy) => (
            <Policy key={policy.node.id} policy={policy} />
          ))}
        </div>
      </div>
    </>
  );
}
