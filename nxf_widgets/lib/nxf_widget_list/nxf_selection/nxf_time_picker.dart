import 'package:flutter/material.dart';

Future<void> showNxfTimePicker({
  required BuildContext context,
  required ValueChanged<TimeOfDay?> onTimeSelected,
  TimeOfDay? initialTime,
}) async {
  final TimeOfDay now = TimeOfDay.now();
  final TimeOfDay? picked = await showTimePicker(
    context: context,
    initialTime: initialTime ?? now,
  );
  onTimeSelected(picked);
}
