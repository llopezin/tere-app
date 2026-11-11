import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/client";
import { ApiError } from "@/lib/api-error";

export function patientProfileQueryOptions() {
  return queryOptions({
    queryKey: ["patient-profile"],
    queryFn: async () => {
      const res = await client.me.$get();
      if (!res.ok) throw new ApiError(res.status, "Failed to fetch patient profile");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

async function putPatientProfile(input: { nie: string }) {
  const res = await client.me.$put({ json: input });
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(res.status, "message" in data ? String(data.message) : "Error al guardar tus datos");
  }
  return data;
}

export function useUpdatePatientProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: putPatientProfile,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: patientProfileQueryOptions().queryKey }),
  });
}
