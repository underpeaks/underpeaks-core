// app/installer/actions/createFlutterProject.ts
export async function createFlutterProject(projectName: string) {
  const res = await fetch('/api/flutter/create', {  // <-- use absolute path here
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ projectName }),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Flutter project creation failed');
  }

  return data.output;
}
