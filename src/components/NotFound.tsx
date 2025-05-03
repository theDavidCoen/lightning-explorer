import { AlertTriangle } from "lucide-react";

import Header from "./Header";

export default function NotFound() {
  return (
    <>
      <Header />
      <div className="flex flex-col items-center justify-center m-10">
        <div className="flex items-center justify-center gap-2">
          <AlertTriangle className="w-10 h-10" />
          <h1>Not found</h1>
        </div>
      </div>
    </>
  );
}
