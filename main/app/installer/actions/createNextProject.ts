export async function createNextJSProject(projectName: string) {
  const res = await fetch('/api/nextjs/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ projectName }),
  });

  const data = await res.json();

  if (!data.success) {
    throw new Error(data.error || 'NextJS project creation failed');
  }

  // Return skipped info for the installer UI
  return {
    ...data,
    skipped: data.skipped || false,
  };
}
