import GalleryPageClient from './GalleryPageClient'

export function generateStaticParams() {
  return [
    { galleryId: 'nature' },
    { galleryId: 'snow' },
    { galleryId: 'uni' },
    { galleryId: 'urban' },
  ]
}

export default async function GalleryPage({ params }: { params: Promise<{ galleryId: string }> }) {
  const { galleryId } = await params
  return <GalleryPageClient galleryId={galleryId} />
}
