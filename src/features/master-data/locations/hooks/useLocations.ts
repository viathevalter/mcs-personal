import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { locationsApi } from '../api/locationsApi';
import type { CreateCountryDTO, UpdateCountryDTO, CreateRegionDTO, UpdateRegionDTO } from '../types';

// Countries
export function useCountries() {
  return useQuery({
    queryKey: ['countries'],
    queryFn: () => locationsApi.getCountries(),
    staleTime: 1000 * 60 * 60, // 1 hour (countries rarely change)
  });
}

export function useMutateCountry() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: CreateCountryDTO) => locationsApi.createCountry(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['countries'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCountryDTO }) => locationsApi.updateCountry(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['countries'] }),
  });

  return {
    createCountry: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateCountry: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}

// Regions
export function useRegions(countryId?: string) {
  return useQuery({
    queryKey: ['regions', countryId],
    queryFn: () => locationsApi.getRegions(countryId),
    staleTime: 1000 * 60 * 60,
    enabled: countryId !== undefined, // only run if explicitly asked for all, or if countryId is provided (we can allow undefined to get all)
  });
}

export function useAllRegions() {
  return useQuery({
    queryKey: ['regions', 'all'],
    queryFn: () => locationsApi.getRegions(),
    staleTime: 1000 * 60 * 60,
  });
}

export function useMutateRegion() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: CreateRegionDTO) => locationsApi.createRegion(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['regions'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRegionDTO }) => locationsApi.updateRegion(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['regions'] }),
  });

  return {
    createRegion: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateRegion: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
