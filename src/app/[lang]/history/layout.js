// Default metadata for /history; the page's generateMetadata refines it per season.
export const metadata = {
  title: 'F1 History: World Champions and Season Results',
  description: 'Every Formula 1 world champion since 1950, with race winners and standings for each season.',
  alternates: { canonical: '/history' },
};

export default function HistoryLayout({ children }) {
  return children;
}
