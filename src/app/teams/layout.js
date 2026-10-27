const title = 'F1 Teams: Constructors and Drivers';
const description = 'Every Formula 1 team on the current grid with its drivers, championship position and points.';

export const metadata = {
  title,
  description,
  alternates: { canonical: '/teams' },
  openGraph: { title, description, url: '/teams' },
};

export default function TeamsLayout({ children }) {
  return children;
}
