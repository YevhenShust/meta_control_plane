import { Navbar, Alignment, Button, ButtonGroup, Menu, MenuItem, Icon } from '@blueprintjs/core';
import useSetups from '../setup/useSetups';

export default function Header() {
  const { setups, selectedId, setSelectedId, createSetup } = useSetups();

  // keep DOM structure similar: left area with label+select, right area with actions and current id
  return (
    <Navbar className="app-header">
      <Navbar.Group align={Alignment.LEFT}>
        <Navbar.Heading className="header-heading">Setup:</Navbar.Heading>
        <Menu>
          <MenuItem text={selectedId ? (setups.find(s => s.id === selectedId)?.name ?? selectedId) : 'Select setup'} disabled={false}>
            {setups.map(s => (
              <MenuItem key={s.id} text={s.name ?? s.id} onClick={() => setSelectedId(s.id)} />
            ))}
          </MenuItem>
        </Menu>
      </Navbar.Group>

      <Navbar.Group align={Alignment.RIGHT}>
        <ButtonGroup minimal>
          <Button icon={<Icon icon="add" />} onClick={async () => {
            const name = prompt('Setup name');
            if (name) await createSetup(name);
          }} />
        </ButtonGroup>
        <div className="muted-text">Current ID:</div>
        <div aria-label="current-setup-id" className="current-setup-id">{selectedId ?? ''}</div>
      </Navbar.Group>
    </Navbar>
  );
}
