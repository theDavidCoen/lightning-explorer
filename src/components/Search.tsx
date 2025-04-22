import { useState } from "react";
import { useNavigate } from "react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function Search() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  return (
    <>
      <>
        <h1>Lightning Explorer</h1>
        <Input onChange={(e) => setSearch(e.target.value)} />
        <Button onClick={() => navigate(`/node/${search}`)}>Search</Button>
      </>
    </>
  );
}

export default Search;
