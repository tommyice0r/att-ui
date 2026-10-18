import './global.css'

import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {BrowserRouter} from 'react-router'
import {Toaster} from 'sonner'
import App from './App'
import AuthGate from './auth/AuthGate'

const container = document.querySelector('#root')

if (container) {
	const root = createRoot(container)
	root.render(
		<StrictMode>
			<BrowserRouter>
				<Toaster
					theme='dark'
					position='top-right'
					richColors
					closeButton
					toastOptions={{
						style: {
							background: '#13161f',
							border: '1px solid rgba(255, 255, 255, 0.08)',
							color: '#e2e8f0'
						}
					}}
				/>
				<AuthGate>
					<App />
				</AuthGate>
			</BrowserRouter>
		</StrictMode>
	)
}
