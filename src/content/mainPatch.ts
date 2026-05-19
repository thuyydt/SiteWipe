/**
 * MAIN-world content script. Installs the storage watch at document_start
 * so it runs before page JS caches references to Storage.prototype methods.
 */
import { installSitewipeStorageWatch } from '@/injected/pageStorage'

installSitewipeStorageWatch()
