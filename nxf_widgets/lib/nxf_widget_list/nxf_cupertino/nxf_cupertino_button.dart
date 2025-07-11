import 'package:flutter/cupertino.dart';

class NxfCupertinoButton extends StatelessWidget {
  final String text;
  final VoidCallback onPressed;

  const NxfCupertinoButton({
    super.key,
    required this.text,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return CupertinoButton(
      onPressed: onPressed,
      child: Text(text),
    );
  }
}
