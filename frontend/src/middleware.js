export { default } from 'next-auth/middleware';

export const config = {
  // สั่งล็อกเฉพาะหน้าสร้างเกม และหน้าดูสถิติ
  matcher: ['/create/:path*', '/analytics/:path*'],
};