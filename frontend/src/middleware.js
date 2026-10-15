import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  // สั่งล็อกเฉพาะหน้าสร้างเกม และหน้าดูสถิติ
  matcher: ['/create/:path*', '/analytics/:path*'],
};