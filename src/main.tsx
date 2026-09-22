import './global.css'

import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {BrowserRouter} from 'react-router'
import App from './App'
import AuthGate from './auth/AuthGate'

const container = document.querySelector('#root')

if (container) {
	const root = createRoot(container)
	root.render(
		<StrictMode>
			<BrowserRouter>
				<AuthGate>
					<App />
				</AuthGate>
			</BrowserRouter>
		</StrictMode>
	)
}
