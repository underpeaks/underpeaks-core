import { redirect } from 'next/navigation'
import { hasValidConfig } from '../config'

export default async function Home() {
  const config = await hasValidConfig();

  console.log('HAS VALID CONFIG: '+ config?.installed);

  if (config?.installed === true) {
    redirect('/signin')
  }

  redirect('/installer')
}