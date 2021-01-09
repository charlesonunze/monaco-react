import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import monaco from '@monaco-editor/loader';

import MonacoContainer from '../MonacoContainer';
import useMount from '../hooks/useMount';
import useUpdate from '../hooks/useUpdate';
import { noop } from '../utils';

function Editor({
  value,
  language,
  editorDidMount,
  theme,
  line,
  width,
  height,
  loading,
  options,
  snippets,
  overrideServices,
  _isControlledMode,
  className,
  wrapperClassName,
}) {
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isMonacoMounting, setIsMonacoMounting] = useState(true);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const containerRef = useRef(null);
  const editorDidMountRef = useRef(editorDidMount);

  useMount(() => {
    const cancelable = monaco.init();

    cancelable
      .then(monaco => ((monacoRef.current = monaco) && setIsMonacoMounting(false)))
      .catch(error => error?.type !== 'cancelation' &&
        console.error('Monaco initialization: error:', error));

    return () => editorRef.current ? disposeEditor() : cancelable.cancel();
  });

  useUpdate(() => {
    editorRef.current.updateOptions(options);
  }, [options], isEditorReady);

  useUpdate(() => {
    if (editorRef.current.getOption(monacoRef.current.editor.EditorOption.readOnly)) {
      editorRef.current.setValue(value);
    } else {
      if (value !== editorRef.current.getValue()) {
        editorRef.current.executeEdits('', [{
          range: editorRef.current.getModel().getFullModelRange(),
          text: value,
          forceMoveMarkers: true,
        }]);

        if (_isControlledMode) {
          const model = editorRef.current.getModel();

          model.forceTokenization(model.getLineCount());
        }

        editorRef.current.pushUndoStop();
      }
    }
  }, [value], isEditorReady);

  useUpdate(() => {
    monacoRef.current.editor.setModelLanguage(editorRef.current.getModel(), language);
  }, [language], isEditorReady);

  useUpdate(() => {
    editorRef.current.setScrollPosition({ scrollTop: line });
  }, [line], isEditorReady);

  useUpdate(() => {
    monacoRef.current.editor.setTheme(theme);
  }, [theme], isEditorReady);

  const createEditor = useCallback(() => {
    editorRef.current = monacoRef.current.editor.create(containerRef.current, {
      value,
      language,
      automaticLayout: true,
      ...options,
    }, overrideServices);

    monacoRef.current.editor.setTheme(theme);

    if (snippets.length > 0) {
      snippets.forEach(({ language, suggestions }) => {
        monacoRef.current.languages.registerCompletionItemProvider(language, {
          provideCompletionItems: () => {
            return {
              suggestions: suggestions.map((suggestion) => {
                suggestion.kind = monacoRef.current.languages.CompletionItemKind[suggestion.kind || 'Snippet'];
                return suggestion
              })
            };
          }
        });
      });
    }

    setIsEditorReady(true);
  }, [language, options, overrideServices, theme, value, snippets]);

  useEffect(() => {
    if (isEditorReady) {
      editorDidMountRef.current(
        editorRef.current.getValue.bind(editorRef.current),
        editorRef.current,
      );
    }
  }, [isEditorReady]);

  useEffect(() => {
    !isMonacoMounting && !isEditorReady && createEditor();
  }, [isMonacoMounting, isEditorReady, createEditor]);

  const disposeEditor = () => editorRef.current.dispose();

  return (
    <MonacoContainer
      width={width}
      height={height}
      isEditorReady={isEditorReady}
      loading={loading}
      _ref={containerRef}
      className={className}
      wrapperClassName={wrapperClassName}
    />
  );
}

Editor.propTypes = {
  value: PropTypes.string,
  language: PropTypes.string,
  editorDidMount: PropTypes.func,
  theme: PropTypes.string,
  line: PropTypes.number,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  loading: PropTypes.oneOfType([PropTypes.element, PropTypes.string]),
  options: PropTypes.object,
  className: PropTypes.string,
  wrapperClassName: PropTypes.string,
  overrideServices: PropTypes.object,
  _isControlledMode: PropTypes.bool,
};

Editor.defaultProps = {
  editorDidMount: noop,
  theme: 'light',
  width: '100%',
  height: '100%',
  loading: 'Loading...',
  options: {},
  overrideServices: {},
  _isControlledMode: false,
};

export default Editor;
