export function LoadingScreen({ message = "Connecting to your dashboard…" }: { message?: string }) {
  return <main className="login-screen"><p role="status">{message}</p></main>;
}
