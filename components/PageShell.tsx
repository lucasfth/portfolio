import ImageHeader from '@/components/ImageHeader';
import TextSection from '@/components/TextSection';

interface PageShellProps {
  markdown: string;
  children?: React.ReactNode;
}

export default function PageShell({ markdown, children }: PageShellProps) {
  if (children) {
    return (
      <>
        <ImageHeader markdown={markdown} />
        {children}
        <TextSection markdown={markdown} />
      </>
    );
  }

  return (
    <>
      <ImageHeader markdown={markdown} />
      <TextSection markdown={markdown} />
    </>
  );
}
