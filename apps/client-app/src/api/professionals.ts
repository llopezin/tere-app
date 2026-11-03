import { queryOptions } from "@tanstack/react-query";
import { client } from "@/lib/client";
import { ApiError } from "@/lib/api-error";

async function fetchProfessionals() {
  const res = await client.professionals.$get();

  if (!res.ok) throw new ApiError(res.status, "Failed to fetch professionals");
  return await res.json();
}

export function professionalsQueryOptions() {
  return queryOptions({
    queryKey: ["professionals"],
    queryFn: fetchProfessionals,
  });
}
