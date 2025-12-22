import React from "react";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DeliveryCalendar = ({ date, setDate, updateFormData, formData }) => {
  const handleSelect = (selectedDate) => {
    if (!selectedDate) return;

    setDate(selectedDate);

    // Extract the date components directly from the selected date
    // to avoid any timezone conversion issues
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    updateFormData("deliveryDate", formattedDate);
    // Reset time when date changes
    updateFormData("deliveryTime", "");
  };

  // Function to disable past dates and specific disabled dates
  const disabledDays = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Disable today and past dates
    if (date <= today) return true;

    // Check for specifically disabled dates (format: YYYY-MM-DD)
    const disabledDates = process.env.NEXT_PUBLIC_DISABLED_DELIVERY_DATES?.split(',') || [];
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (disabledDates.includes(dateStr)) return true;

    return false;
  };

  const generateTimeSlots = () => {
    const slots = [];
    // Generate slots between 10:00 and 17:00 (5 PM)
    for (let hour = 10; hour < 17; hour++) {
      // Add full hour slot
      const fullHourValue = `${hour.toString().padStart(2, "0")}:00`;
      slots.push({
        value: fullHourValue,
        label: `${fullHourValue}`,
      });
      // Add half hour slot
      const halfHourValue = `${hour.toString().padStart(2, "0")}:30`;
      slots.push({
        value: halfHourValue,
        label: `${halfHourValue}`,
      });
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-lg font-medium text-gray-700">
        <CalendarIcon className="w-5 h-5" />
        <h2 className="text-gray-700">Delivery details</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="">
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Delivery date
          </label>
          <div className="flex flex-col items-center justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleSelect}
              disabled={disabledDays}
              initialFocus
            />
          </div>
        </div>
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Delivery time
          </label>
          <Select
            value={formData.deliveryTime}
            onValueChange={(value) => updateFormData("deliveryTime", value)}
            disabled={!date}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a time" />
            </SelectTrigger>
            <SelectContent>
              {timeSlots.length > 0 ? (
                timeSlots.map((slot) => (
                  <SelectItem key={slot.value} value={slot.value}>
                    {slot.label}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-slots-available" disabled>
                  No time slots available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-red-500 py-2">
          please note that your order may arrive up to 15 minutes earlier or later than the requested delivery time.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeliveryCalendar;
