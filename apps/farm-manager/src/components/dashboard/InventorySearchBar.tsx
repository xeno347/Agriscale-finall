import { Input } from "@/components/ui/input";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const InventorySearchBar: React.FC<Props> = ({ value, onChange }) => {
  return (
    <div className="w-full flex gap-3 items-center">
      <Input
        placeholder="Search inventory by name, category, supplier..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full"
      />
    </div>
  );
};

export default InventorySearchBar;
