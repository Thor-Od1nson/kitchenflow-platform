import { NextResponse, type NextRequest } from 'next/server';
import { canAccessRoute, getDefaultRouteByRole, isRole } from './lib/rbac-routes';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('kf_access_token')?.value;
  const hasSession =
    Boolean(accessToken) ||
    Boolean(request.cookies.get('kf_refresh_token')?.value);
  const role = getRoleFromJwt(accessToken);

  if (pathname.startsWith('/dashboard') && !hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === '/login' && hasSession) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = role ? getDefaultRouteByRole(role) : '/dashboard';
    dashboardUrl.search = '';
    return NextResponse.redirect(dashboardUrl);
  }

  if (pathname.startsWith('/dashboard') && role && !canAccessRoute(role, pathname)) {
    const fallbackUrl = request.nextUrl.clone();
    fallbackUrl.pathname = getDefaultRouteByRole(role);
    fallbackUrl.search = '';
    if (fallbackUrl.pathname !== pathname) {
      return NextResponse.redirect(fallbackUrl);
    }
  }

  return NextResponse.next();
}

function getRoleFromJwt(token?: string) {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { role?: unknown };
    return isRole(decoded.role) ? decoded.role : null;
  } catch {
    return null;
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/login']
};
