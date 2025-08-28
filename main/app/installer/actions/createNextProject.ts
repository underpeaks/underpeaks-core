// app/installer/actions/createFlutterProject.ts
export async function createNextJSProject(projectName: string) {
  const res = await fetch('/api/nextjs/create', {  // <-- use absolute path here
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

  return data;
}



