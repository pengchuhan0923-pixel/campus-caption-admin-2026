export default function Loading() {
  return <div className="grid animate-pulse gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-40 bg-[#e3ddd2]"/>)}<div className="h-80 bg-[#e3ddd2] sm:col-span-2 xl:col-span-4"/></div>;
}

