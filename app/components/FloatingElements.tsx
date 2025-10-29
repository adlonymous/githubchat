export function FloatingElements() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Floating geometric shapes */}
      <div className="absolute top-20 left-10 w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full opacity-20 animate-float-slow"></div>
      <div className="absolute top-40 right-20 w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg opacity-15 animate-float-medium rotate-45"></div>
      <div className="absolute top-60 left-1/4 w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full opacity-25 animate-float-fast"></div>
      <div className="absolute bottom-40 right-1/3 w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full opacity-10 animate-float-slow"></div>
      <div className="absolute bottom-20 left-1/3 w-14 h-14 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg opacity-20 animate-float-medium"></div>
      
      {/* Additional floating elements */}
      <div className="absolute top-1/3 right-10 w-6 h-6 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full opacity-30 animate-float-fast"></div>
      <div className="absolute bottom-1/3 left-20 w-10 h-10 bg-gradient-to-br from-pink-400 to-red-500 rounded-lg opacity-15 animate-float-slow rotate-12"></div>
      <div className="absolute top-1/2 left-10 w-4 h-4 bg-gradient-to-br from-teal-400 to-green-500 rounded-full opacity-25 animate-float-medium"></div>
      
      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/2 w-32 h-32 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-xl animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-full blur-xl animate-pulse-medium"></div>
    </div>
  );
}
