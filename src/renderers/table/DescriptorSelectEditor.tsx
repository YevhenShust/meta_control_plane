import { forwardRef, useImperativeHandle, useRef, useState, useEffect, useMemo, useCallback } from 'react';
import type { ICellEditorComp, ICellEditorParams } from 'ag-grid-community';
import { Button, InputGroup, Menu, MenuItem, MenuDivider, Popover, Spinner } from '@blueprintjs/core';
import { useSearchDraftsQuery } from '../../store/api';
import NewDraftDrawer from '../../components/NewDraftDrawer';
import { resolveSchemaIdByKey } from '../../core/schemaKeyResolver';
import { loadSchemaByKey } from '../../core/schemaKeyResolver';
import { tryParseContent } from '../../core/parse';

interface DescriptorOption {
  id: string;
  label: string;
  value: string;
}

interface DescriptorSelectEditorParams extends ICellEditorParams {
  setupId: string;
  schemaKey: string;
  descriptorSchemaKey?: string;
}

const DescriptorSelectEditor = forwardRef<ICellEditorComp, DescriptorSelectEditorParams>((props, ref) => {
  const [value, setValue] = useState(String(props.value ?? ''));
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [schemaId, setSchemaId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSchema, setDrawerSchema] = useState<object | null>(null);
  const [localOptions, setLocalOptions] = useState<DescriptorOption[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  // Debounce search query
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  // Resolve descriptor schema ID
  useEffect(() => {
    if (!props.setupId || !props.descriptorSchemaKey) return;
    let mounted = true;
    (async () => {
      const id = await resolveSchemaIdByKey(props.setupId, props.descriptorSchemaKey!);
      if (mounted) setSchemaId(id);
    })();
    return () => { mounted = false; };
  }, [props.setupId, props.descriptorSchemaKey]);

  // Fetch search results
  const { data: searchResults, isFetching } = useSearchDraftsQuery(
    {
      setupId: props.setupId,
      schemaId: schemaId || undefined,
      query: debouncedQuery,
    },
    { skip: !props.setupId || !schemaId }
  );

  // Combine search results with local options (newly created)
  const options = useMemo(() => {
    const combined = [...localOptions];
    if (searchResults) {
      for (const result of searchResults) {
        if (!combined.find(o => o.id === result.id)) {
          combined.push(result);
        }
      }
    }
    return combined;
  }, [searchResults, localOptions]);

  // Filter options by query on client side
  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(opt => 
      opt.label.toLowerCase().includes(q) || 
      opt.id.toLowerCase().includes(q)
    );
  }, [options, query]);

  useImperativeHandle(ref, () => ({
    getValue: () => value,
    getGui: () => containerRef.current!,
    isCancelBeforeStart: () => false,
    isCancelAfterEnd: () => false,
  }));

  const handleSelect = useCallback((item: DescriptorOption) => {
    setValue(item.value);
    setPopoverOpen(false);
    setQuery(item.label);
  }, []);

  const handleOpenDrawer = useCallback(async () => {
    try {
      if (!props.setupId || !props.descriptorSchemaKey) return;
      const { json } = await loadSchemaByKey(props.setupId, props.descriptorSchemaKey);
      const parsed = tryParseContent(json) as object;
      setDrawerSchema(parsed);
      setDrawerOpen(true);
      setPopoverOpen(false);
    } catch (e) {
      console.error('Failed to load schema for drawer:', e);
    }
  }, [props.setupId, props.descriptorSchemaKey]);

  const handleDraftCreated = useCallback((draft: DescriptorOption) => {
    // Add to local options so it appears in the list immediately
    setLocalOptions(prev => [...prev, draft]);
    // Set as selected value
    setValue(draft.value);
    setQuery(draft.label);
    // Close drawer
    setDrawerOpen(false);
  }, []);

  const menuContent = (
    <Menu style={{ maxHeight: '300px', overflowY: 'auto' }}>
      {isFetching && (
        <MenuItem disabled icon={<Spinner size={16} />} text="Loading..." />
      )}
      {!isFetching && filteredOptions.length === 0 && (
        <MenuItem disabled text="No results" />
      )}
      {!isFetching && filteredOptions.map(item => (
        <MenuItem
          key={item.id}
          text={item.label}
          onClick={() => handleSelect(item)}
        />
      ))}
      <MenuDivider />
      <MenuItem
        icon="add"
        text="Create new..."
        onClick={handleOpenDrawer}
      />
    </Menu>
  );

  return (
    <div ref={containerRef} style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '4px' }}>
      <Popover
        content={menuContent}
        isOpen={popoverOpen}
        onClose={() => setPopoverOpen(false)}
        placement="bottom-start"
        minimal
        matchTargetWidth
      >
        <InputGroup
          inputRef={inputRef}
          value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          placeholder="Search or create..."
          small
          fill
          rightElement={
            <Button
              icon="caret-down"
              minimal
              small
              onClick={() => setPopoverOpen(!popoverOpen)}
            />
          }
        />
      </Popover>
      
      {drawerOpen && drawerSchema && props.descriptorSchemaKey && (
        <NewDraftDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          setupId={props.setupId}
          schemaKey={props.descriptorSchemaKey}
          schema={drawerSchema}
          onSuccess={() => {
            // Draft created successfully - handled by onDraftCreated
          }}
          onDraftCreated={handleDraftCreated}
        />
      )}
    </div>
  );
});

DescriptorSelectEditor.displayName = 'DescriptorSelectEditor';

export default DescriptorSelectEditor;
