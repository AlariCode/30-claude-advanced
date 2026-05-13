import type { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Вход — Video Meetings',
}

export default function LoginPage() {
  return <LoginForm />
}
