import { Navbar, Alignment, Button, ButtonGroup, Menu, MenuItem, Icon } from '@blueprintjs/core';
import useSetups from '../setup/useSetups';

export default function Header() {
  const { setups, selectedId, setSelectedId, createSetup } = useSetups();

  // Header using Blueprint Navbar; theme classes are applied globally via body
  return (
    <Navbar>
      <Navbar.Group align={Alignment.START}>
        <Navbar.Heading>Setup:</Navbar.Heading>
        <Menu>
          <MenuItem text={selectedId ? (setups.find(s => s.id === selectedId)?.name ?? selectedId) : 'Select setup'} disabled={false}>
            {setups.map(s => (
              <MenuItem key={s.id} text={s.name ?? s.id} onClick={() => setSelectedId(s.id)} />
            ))}
          </MenuItem>
        </Menu>
      </Navbar.Group>

      <Navbar.Group align={Alignment.END}>
        <ButtonGroup minimal>
          <Button icon={<Icon icon="add" />} onClick={async () => {
            const name = prompt('Setup name');
            if (name) await createSetup(name);
          }} />
        </ButtonGroup>
        <div className="muted-text">Current ID:</div>
        <div aria-label="current-setup-id" className="current-setup-id">{selectedId ?? '\u0014'}</div>
      </Navbar.Group>
    </Navbar>
  );
}
