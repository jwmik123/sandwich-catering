import React from "react";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DeliveryCalendar = ({ date, setDate, updateFormData, formData }) => {
  const handleSelect = (selectedDate) => {
    setDate(selectedDate);
    // Format the date as ISO string and take only the date part
    const formattedDate = selectedDate.toISOString().split("T")[0];
    updateFormData("deliveryDate", formattedDate);
    // Reset time when date changes
    updateFormData("deliveryTime", "");
  };

  // Function to disable past dates and weekends
  const disabledDays = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Disable past dates
    if (date < today) return true;
    // Disable weekends (0 is Sunday, 6 is Saturday)
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const generateTimeSlots = () => {
    const slots = [];
    const currentDate = new Date();
    const selectedDate = date ? new Date(date) : null;
    const isToday = selectedDate?.toDateString() === currentDate.toDateString();
    // Start time: if today, start 2 hours from now (rounded up to next hour)
    let startHour = 10; // Default start hour
    if (isToday) {
      startHour = currentDate.getHours() + 2;
      if (currentDate.getMinutes() > 0) {
        startHour += 1; // Round up to next hour if we have minutes
      }
      startHour = Math.max(startHour, 10); // Don't start earlier than 9
    }
    // Generate slots between start hour and 17:00 (5 PM)
    for (let hour = startHour; hour < 17; hour++) {
      // Skip if it's today and the time slot is in the past
      if (isToday && hour <= currentDate.getHours()) continue;
      const timeValue = `${hour.toString().padStart(2, "0")}:00`;
      slots.push({
        value: timeValue,
        label: `${timeValue}`,
      });
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-lg font-medium text-gray-700">
        <CalendarIcon className="w-5 h-5" />
        <h2>Delivery details</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Delivery date
          </label>
          <div className="flex flex-col justify-center items-center">
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
        </div>
      </div>
    </div>
  );
};

export default DeliveryCalendar;
