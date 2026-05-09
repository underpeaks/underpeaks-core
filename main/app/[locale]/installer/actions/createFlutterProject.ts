export async function createFlutterProject(projectName: string) {
  const res = await fetch('/api/flutter/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectName }),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Flutter project creation failed');
  }

  if (data.skipped) {
    console.log(`Flutter project creation skipped: ${data.output}`);
  } else {
    console.log(`Flutter project created: ${data.output}`);
  }

  return data.output;
}
