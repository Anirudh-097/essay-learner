import "./globals.css";

export const metadata = {
  title: "Essay Learner",
  description: "A focused GRE analytical writing practice space.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
