import { AlertTriangle } from "lucide-react";

const errorToString = (error: unknown) => {
  if (error instanceof Error) {
    return (error as Error).message;
  }

  return String(error);
};

export default function Error({ error }: { error: unknown }) {
  return (
    <>
      <div className="flex items-center justify-center gap-2">
        <AlertTriangle className="w-10 h-10" />
        <h1>Error</h1>
      </div>
      <p>{errorToString(error)}</p>
    </>
  );
}
