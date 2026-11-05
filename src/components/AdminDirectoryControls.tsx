import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faFilter, faRotateRight, faXmark } from '@fortawesome/free-solid-svg-icons';
import { MembershipBillingSelect } from './MembershipBillingSelect';
import { LoadingSpinner } from './LoadingSpinner';
import '../styles/AdminDirectory.css';

interface Field { key: string; label: string; options?: { value: string; label: string }[]; date?: boolean }
interface Controls {
  params: Record<string, string>; searchTerm: string; updateSearchTerm: (value: string) => void;
  setParam: (key: string, value: string) => void; clear: () => void; fetching: boolean;
  refresh: () => Promise<void>; page: number; pages: number; pageSize: number; total: number;
}

export function AdminDirectoryToolbar({ list, fields, placeholder }: { list: Controls; fields: Field[]; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const active = fields.filter(field => list.params[field.key] && list.params[field.key] !== 'upcoming').length;
  return <section className="ad-toolbar" aria-label="Filtros del listado">
    <div className="ad-search-row">
      <input className="browser-default ad-search" type="search" aria-label={placeholder} placeholder={placeholder} value={list.searchTerm} onChange={event => list.updateSearchTerm(event.target.value)} />
      <button type="button" className="ad-icon ad-filter-toggle" aria-label={`Filtros${active ? `, ${active} activos` : ''}`} aria-expanded={open} onClick={() => setOpen(value => !value)} title="Filtros"><FontAwesomeIcon icon={faFilter} />{active > 0 && <span>{active}</span>}</button>
      <button type="button" className="ad-icon" aria-label="Actualizar listado" title="Actualizar listado" disabled={list.fetching} onClick={() => void list.refresh()}>{list.fetching ? <LoadingSpinner size={18} /> : <FontAwesomeIcon icon={faRotateRight} />}</button>
      <button type="button" className="ad-icon" aria-label="Limpiar filtros" title="Limpiar filtros" onClick={list.clear}><FontAwesomeIcon icon={faXmark} /></button>
    </div>
    <div className={`ad-filters${open ? ' is-open' : ''}`}>
      {fields.map(field => field.date ? <label key={field.key} className="ad-date">{field.label}<input type="date" className="browser-default" value={list.params[field.key]} onChange={event => list.setParam(field.key, event.target.value)} /></label> :
        <MembershipBillingSelect key={field.key} label={field.label} value={list.params[field.key]} options={field.options!} onChange={value => list.setParam(field.key, value)} />)}
    </div>
    <div className="ad-loading" role="status" aria-live="polite">{list.fetching && <><LoadingSpinner size={16} /><span>Actualizando listado...</span></>}</div>
  </section>;
}

export function AdminDirectoryPagination({ list }: { list: Pick<Controls, 'page' | 'pages' | 'pageSize' | 'total' | 'fetching' | 'setParam'> }) {
  const from = list.total ? (list.page - 1) * list.pageSize + 1 : 0;
  return <div className="ad-pagination" aria-label="Paginación">
    <span role="status">{from}–{Math.min(list.page * list.pageSize, list.total)} de {list.total}</span>
    <MembershipBillingSelect label="Por página" value={String(list.pageSize)} options={[25, 50, 100].map(value => ({ value: String(value), label: String(value) }))} onChange={value => list.setParam('pageSize', value)} />
    <div className="ad-page-actions">
      <button type="button" className="ad-icon" aria-label="Página anterior" title="Página anterior" disabled={list.fetching || list.page <= 1} onClick={() => list.setParam('page', String(list.page - 1))}><FontAwesomeIcon icon={faChevronLeft} /></button>
      <span>{list.page} / {list.pages}</span>
      <button type="button" className="ad-icon" aria-label="Página siguiente" title="Página siguiente" disabled={list.fetching || list.page >= list.pages} onClick={() => list.setParam('page', String(list.page + 1))}><FontAwesomeIcon icon={faChevronRight} /></button>
    </div>
  </div>;
}
