import { Link, Outlet } from 'react-router-dom';
import { usePlatform, localPreview } from './Platform';

export default function AppLayout() {
  const {identity}=usePlatform();
  return <div className="antialiased min-h-screen flex flex-col">
    <header className="army-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0"><span className="text-2xl font-bold text-[#FFD700]">38G</span></div>
            <div className="hidden sm:block"><span className="text-lg font-semibold text-white">Talent Search</span></div>
          </div>
          <nav className="flex items-center gap-1" aria-label="Main navigation">
            <Link to="/search" className="px-4 py-2 text-sm font-medium text-gray-200 hover:text-[#FFD700] hover:bg-white/10 rounded-md transition-colors">Search</Link>
            <Link to="/builder" className="px-4 py-2 text-sm font-medium text-gray-200 hover:text-[#FFD700] hover:bg-white/10 rounded-md transition-colors">Card Builder</Link>
          <span className="hidden md:block text-xs text-gray-200" title={`AIP user: ${identity.id}`}>{[identity.givenName,identity.familyName].filter(Boolean).join(' ') || 'Signed in'}</span>
          </nav>
        </div>
      </div>
    </header>
    <main className="flex-1"><Outlet /></main>
    <footer className="bg-muted border-t flex-shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <p className="text-xs text-muted-foreground text-center">38G Military Government Specialist Program{localPreview ? ' · Development preview: fictional profiles; publishing requires deployed AIP' : ''}</p>
      </div>
    </footer>
  </div>;
}
