import 'package:flutter/material.dart';

Future<void> showNxfDatePicker({
  required BuildContext context,
  required ValueChanged<DateTime?> onDateSelected,
  DateTime? initialDate,
  DateTime? firstDate,
  DateTime? lastDate,
}) async {
  final DateTime now = DateTime.now();
  final DateTime? picked = await showDatePicker(
    context: context,
    initialDate: initialDate ?? now,
    firstDate: firstDate ?? DateTime(now.year - 5),
    lastDate: lastDate ?? DateTime(now.year + 5),
  );
  onDateSelected(picked);
}
