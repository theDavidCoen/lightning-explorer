import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMemo } from "react";
import { NavLink, useParams } from "react-router";
import useSWR from "swr";

import { API_URL, CURRENCY } from "../lib/env";
import { satoshisToSatcomma } from "../lib/utils";
import Error from "./Error";
import Header from "./Header";
import LoadingSpinnter, { LoadingSpinnerFullscreen } from "./LoadingSpinner";

export type NodeInfo = {
  alias: string;
  color: string;
  id: string;
};

type Channel = {
  source: {
    id: string;
    alias: string;
    color: string;
  };
  shortChannelId: string;
  capacity: number;
  active: boolean;
  info: {
    baseFeeMillisatoshi: number;
    feePpm: number;
    delay: number;
    htlcMinimumMillisatoshi: number;
    htlcMaximumMillisatoshi: number;
  };
};

function Channels({ channels }: { channels: Channel[] }) {
  const averagePpm = useMemo(() => {
    return (
      channels.reduce((acc, channel) => acc + channel.info.feePpm, 0) /
      channels.length
    ).toFixed(2);
  }, [channels]);

  const activeChannels = useMemo(() => {
    return channels.filter((channel) => channel.active);
  }, [channels]);

  const adjustedPpm = useMemo(() => {
    return (
      activeChannels.reduce(
        (acc, channel) => acc + channel.info.feePpm * channel.capacity,
        0,
      ) / activeChannels.reduce((acc, channel) => acc + channel.capacity, 0) ||
      0
    ).toFixed(2);
  }, [activeChannels]);

  return (
    <>
      <div className="flex flex-row justify-between gap-4 mt-4">
        <h2>
          Capacity:{" "}
          {satoshisToSatcomma(
            channels.reduce((acc, channel) => acc + channel.capacity, 0),
          )}
        </h2>
      </div>
      <div className="flex flex-row justify-between gap-4 mt-1">
        <h2>Channels: {channels.length}</h2>
        <h2>Inactive: {channels.length - activeChannels.length}</h2>
        <h2>
          Active: {((activeChannels.length / channels.length) * 100).toFixed(2)}
          %
        </h2>
      </div>
      <div className="flex flex-row justify-between gap-4 mt-1">
        <h2>Adjusted PPM: {adjustedPpm}</h2>
        <h2>Average PPM: {averagePpm}</h2>
      </div>

      <hr />

      <div className="m-8 w-full max-w-7xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Channel ID</TableHead>
              <TableHead className="w-[100px]">Node</TableHead>
              <TableHead className="w-[100px]">Alias</TableHead>
              <TableHead className="text-right">Capacity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {channels.map((channel) => (
              <TableRow
                className={`hover:bg-muted/50 transition duration-150 ${
                  !channel.active ? "bg-yellow-500/5" : ""
                }`}>
                <TableCell className="font-medium">
                  {channel.shortChannelId}
                </TableCell>
                <TableCell className="font-medium">
                  <NavLink to={`/node/${channel.source.id}`}>
                    {channel.source.id}
                  </NavLink>
                </TableCell>
                <TableCell className="font-medium">
                  {channel.source.alias}
                </TableCell>
                <TableCell className="text-right">
                  {satoshisToSatcomma(channel.capacity)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function Node() {
  const { node } = useParams();
  const nodeInfo = useSWR<NodeInfo>(
    `${API_URL}/v2/lightning/${CURRENCY}/node/${node}`,
  );
  const channels = useSWR<Channel[]>(
    `${API_URL}/v2/lightning/${CURRENCY}/channels/${node}`,
  );

  if (nodeInfo.error || channels.error) {
    return <Error error={nodeInfo.error || channels.error} />;
  }
  if (nodeInfo.isLoading) {
    return <LoadingSpinnerFullscreen />;
  }

  return (
    <>
      <Header />
      <div className="flex flex-col items-center justify-center">
        <h1>Node: {nodeInfo.data!.alias}</h1>
        <h2>ID: {nodeInfo.data!.id}</h2>

        {channels.isLoading ? (
          <div className="flex justify-center items-center h-full mt-4">
            <LoadingSpinnter />
          </div>
        ) : (
          <Channels
            channels={channels.data!.sort((a, b) => b.capacity - a.capacity)}
          />
        )}
      </div>
    </>
  );
}

export default Node;
