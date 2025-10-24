// @/components/Annotator/AnnotatorExample.tsx

import React from 'react';
import Annotator from './index';

const AnnotatorExample: React.FC = () => {
  return (
    <div className="h-full p-4 overflow-auto">
      <h3 className="text-lg font-semibold mb-4">Annotator Example</h3>
      <Annotator
        initialContent="这是一个示例文本{{4,v}}，用于展示标注功能{{5,w}}。古文{{2,x}}测试内容{{4,y}}。"
        editable={false}
      />
    </div>
  );
};

export default AnnotatorExample;
