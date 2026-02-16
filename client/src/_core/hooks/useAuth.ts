import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();

  // OAuth user query
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Local admin query
  const meLocalQuery = trpc.localAuth.meLocal.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logoutLocalMutation = trpc.localAuth.logoutLocal.useMutation({
    onSuccess: () => {
      utils.localAuth.meLocal.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      // Try both logouts
      await Promise.allSettled([
        logoutMutation.mutateAsync(),
        logoutLocalMutation.mutateAsync()
      ]);
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      utils.localAuth.meLocal.setData(undefined, null);
      await Promise.all([
        utils.auth.me.invalidate(),
        utils.localAuth.meLocal.invalidate()
      ]);
    }
  }, [logoutMutation, logoutLocalMutation, utils]);

  const state = useMemo(() => {
    // Combined user data: prefer OAuth user, fallback to local admin
    const oauthUser = meQuery.data;
    const localAdmin = meLocalQuery.data;

    const combinedUser = oauthUser || (localAdmin ? {
      id: localAdmin.adminId,
      openId: `local-${localAdmin.adminId}`,
      name: localAdmin.fullName || localAdmin.username,
      username: localAdmin.username,
      email: localAdmin.email || "",
      role: localAdmin.role || "admin",
      isLocalAdmin: true
    } : null);

    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(combinedUser)
    );

    const isSuperAdmin = Boolean(
      (localAdmin && localAdmin.role === 'superadmin') ||
      (oauthUser && (oauthUser as any).role === 'admin')
    );

    return {
      user: combinedUser ?? null,
      loading: meQuery.isLoading || meLocalQuery.isLoading || logoutMutation.isPending || logoutLocalMutation.isPending,
      error: meQuery.error ?? meLocalQuery.error ?? logoutMutation.error ?? logoutLocalMutation.error ?? null,
      isAuthenticated: Boolean(combinedUser),
      isLocalAdmin: Boolean(localAdmin && !oauthUser),
      isSuperAdmin,
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    meLocalQuery.data,
    meLocalQuery.error,
    meLocalQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
    logoutLocalMutation.error,
    logoutLocalMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (state.loading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    state.loading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => {
      meQuery.refetch();
      meLocalQuery.refetch();
    },
    logout,
  };
}
