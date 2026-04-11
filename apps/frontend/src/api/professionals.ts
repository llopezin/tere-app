import { queryOptions } from "@tanstack/react-query";
import { client } from "@/lib/client";

async function fetchProfessionals() {
  const res = await client.professionals.$get();

  if (!res.ok) throw new Error("Failed to fetch professionals");
  return await res.json();
}

export function professionalsQueryOptions() {
  return queryOptions({
    queryKey: ["professionals"],
    queryFn: fetchProfessionals,
  });
}
