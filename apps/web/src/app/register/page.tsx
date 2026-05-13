import type { Metadata } from 'next'

import { RegisterForm } from './register-form'

export const metadata: Metadata = {
  title: 'Регистрация — Video Meetings',
  description: 'Создайте аккаунт для участия в видеовстречах',
}

export default function RegisterPage() {
  return <RegisterForm />
}
