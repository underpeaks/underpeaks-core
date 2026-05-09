import SettingsPage from "../components/settings/SettingsPage";


type Props = {
  params: Promise<{ id: string }>;
};

export default async function SettingsRoutePage({ params }: Props) {
  const { id } = await params;
  return <SettingsPage activeId={id} />;
}