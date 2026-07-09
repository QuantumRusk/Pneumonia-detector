import './globals.css';

export const metadata = {
  title: 'Pneumonia Detection System',
  description: 'AI-Powered Radiographic Analysis · Clinical-Grade Diagnostic Console',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#0B132B] text-slate-100">
        {children}
      </body>
    </html>
  );
}