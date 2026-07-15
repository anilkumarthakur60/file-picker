import { mount } from 'svelte'
import App from './App.svelte'
import '@anil-labs/file-picker-core/styles.css'
import './style.css'

mount(App, { target: document.getElementById('app')! })
