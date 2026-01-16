import 'package:flutter/cupertino.dart';

class NxfCupertinoListSection extends StatelessWidget {
  final List<Widget> children;
  final String? header;
  final String? footer;

  const NxfCupertinoListSection({
    super.key,
    required this.children,
    this.header,
    this.footer,
  });

  @override
  Widget build(BuildContext context) {
    return CupertinoListSection(
      header: header != null ? Text(header!) : null,
      footer: footer != null ? Text(footer!) : null,
      children: children,
    );
  }
}
