import ThemingPage from "../components/theming/ThemingPage";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ThemeSubRoutePage({ params }: Props) {
  const { id } = await params;
  return <ThemingPage activeId={id} />;
}