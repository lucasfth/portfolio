import React from 'react';
import ReactMarkdown from 'react-markdown';

function TextSection({ markdown }) {
  const lines = markdown.split('\n');
  const contentStart = lines.findIndex(line => line.startsWith('---'));
  const remainingText = contentStart !== -1 ? lines.slice(contentStart + 1).join('\n') : '';

  return (
    <div className="common-container">
      <div className="inner-container">
        <ReactMarkdown>
          {remainingText}
        </ReactMarkdown>
      </div>
    </div>
  );
}

export default TextSection;