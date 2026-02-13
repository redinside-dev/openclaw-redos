public class Adder {
    public static void main(String[] args) {
        if (args.length == 0) {
            System.err.println("Usage: java Adder \"2+2+2\"  (or: java Adder 2+2+2)");
            System.exit(2);
        }

        String expr = String.join("", args).replaceAll("\\s+", "");
        if (expr.isEmpty()) {
            System.err.println("Empty expression");
            System.exit(2);
        }

        String[] parts = expr.split("\\+");
        long sum = 0;
        for (String p : parts) {
            if (p.isEmpty()) {
                System.err.println("Invalid expression: " + expr);
                System.exit(2);
            }
            try {
                sum += Long.parseLong(p);
            } catch (NumberFormatException e) {
                System.err.println("Invalid number: '" + p + "' in " + expr);
                System.exit(2);
            }
        }

        System.out.println(sum);
    }
}
