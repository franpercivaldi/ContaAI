import { Tabs } from 'antd';
import { Organization } from '../../../../packages/shared-types/src';

type Props = {
  value?: Organization | '';
  onChange?: (org: Organization | '') => void;
};

export default function OrganizationTabs({ value = '', onChange }: Props) {
  return (
    <Tabs
      activeKey={value || ''}
      onChange={(key) => onChange?.(key as Organization | '')}
      size="small"
    >
      <Tabs.TabPane tab="Todas" key="" />
      <Tabs.TabPane tab="Obra Social" key={Organization.OBRA_SOCIAL} />
      <Tabs.TabPane tab="AOITA" key={Organization.AOITA} />
      <Tabs.TabPane tab="Mutual" key={Organization.MUTUAL} />
    </Tabs>
  );
}
