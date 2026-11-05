"use client";
import {
  Button,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
} from "react-aria-components";
import EnquiryIcon, { type IconName } from "./enquiry-icon";
export default function EnquiryChoice({
  label,
  value,
  onChange,
  options,
  icon,
  isDisabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; name: string; icon?: IconName }>;
  icon?: IconName;
  isDisabled?: boolean;
}) {
  return (
    <Select
      aria-label={label}
      selectedKey={value}
      onSelectionChange={(key) => onChange(String(key))}
      className="ei-choice"
      isDisabled={isDisabled}
    >
      <Button className="ei-control">
        {icon && <EnquiryIcon name={icon} />}
        <SelectValue>{({ selectedText }) => selectedText}</SelectValue>
        <EnquiryIcon name="chevron" />
      </Button>
      <Popover className="ei-choice-popover">
        <ListBox items={options}>
          {(item) => (
            <ListBoxItem id={item.id} textValue={item.name}>
              {item.icon && <EnquiryIcon name={item.icon} />}
              <span>{item.name}</span>
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </Select>
  );
}
